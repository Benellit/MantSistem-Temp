import { StyleSheet, Text, View } from 'react-native';

export default function HomeTecnico({ navigation }) {
    return (
        <View style={styles.container}>
            <Text>Home de los tecnicos</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        padding: 20,
    }
});